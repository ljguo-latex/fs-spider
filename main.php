<?php

namespace Ir2025\Controller;

use Ir\Controller\NetworkBaseJavaDbController;
use Getdata\Model\JavaDbModel;

class NetworkPassByCloudFalreBaseController extends NetworkBaseJavaDbController
{



    public $pass_model;

    public $pass_order = 1;

    public $pass_flag = 'cf_001';

    public function __construct()
    {
        parent::__construct();
        $this->pass_model = new JavaDbModel();
        $this->pass_model->db(1,'DB_JAVA_CONFIG');
 
    }
    

    public function getUrlHtml($url) {

        // 压入
        $ids = $this->addLinks([$url]);

        // 解压
        // $this->RecordLog("aaa" , $this->linkFlag);


        $response = $this->getResponse($ids);

        // $this->RecordLog("aaa" . $response[0], $this->linkFlag);
        return $response[0];
		
	}

    public function getHtmlByProxy($urls, $post, $model = 1, &$headerInfo = false) {
        // 压入
        $ids = $this->addLinks($urls);

        // 解压

        $response = $this->getResponse($ids);

        return $response;
    }
    

    // 拉取任务
    public function pullCrontab() {

        if(IS_POST) {
            $links = [];
            // 单次处理 10 个
            $datas = $this->pass_model->table('oc_passby_cloudflare_links_queue')->where([
                'sFlag' => $_POST['flag'],
                'iIsDone' => 0
            ])->limit(10)->select();

            foreach($datas as $data) {
                $links[] = [
                    'id' => $data['id'],
                    'url' => $data['sLink']
                ];
            }

            $this->ajaxReturn($links);
        }
    }
    
    // 提交(推送)任务结果
    public function pushCrontab() {
        if(IS_POST) {
            $datas = $this->pass_model->table('oc_passby_cloudflare_links_queue')->where(['id' => $_POST['id']])->save([
                'sResponse' => $_POST['html'],
                'iIsDone' => $_POST['status'] ? 2 : 3
            ]);
        }
    }

    private function addLinks(array $links) :array {

        $ids = [];
        foreach($links as $link) {
            $id = $this->pass_model->table('oc_passby_cloudflare_links_queue')->add([
                'sLink' => $link,
                'sSiteId' => $this->siteId,
                'sFlag' => $this->pass_flag,
                'iSort' => $this->pass_order
            ]);

            $ids[] = $id;
        }

        return $ids;
    }

    private function getResponse(array $ids) :array {
        $response = [];
        while(true) {
            usleep(1000 * 200); // 暂停 200 ms
            $flag = true;
            foreach($ids as $id) {
                $data = $this->pass_model->table('oc_passby_cloudflare_links_queue')->where([
                    'id' => intval($id)
                ])->find();

                if($data['iIsDone'] == 0 || $data['iIsDone'] == 1) {
                    $flag = false;
                }
            }

            if($flag) break;

        }



        foreach($ids as $id) {
            $data = $this->pass_model->table('oc_passby_cloudflare_links_queue')->where([
                'id' => $id
            ])->find();
            $response[] = $data['sResponse'];
        }

        return $response;
    }

    public function test() {
        $data = $this->pass_model->table('oc_passby_cloudflare_links_queue')->where([
            'id' => 10
        ])->find();

        dump($data);
    }
}